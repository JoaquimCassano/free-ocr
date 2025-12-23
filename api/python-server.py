import modal
from pathlib import Path
from typing import Literal
from pydantic import BaseModel
import base64
import io
import re

app = modal.App()

class ImageRequest(BaseModel):
    image_data: str
    prompt: str = None

MODEL_NAME="deepseek-ai/DeepSeek-OCR"
MODEL_VOLUME_PATH = Path("/model")
MODEL_VOLUME = modal.Volume.from_name("model-cache", create_if_missing=True)
volumes = {MODEL_VOLUME_PATH: MODEL_VOLUME}

def clean_output(text, include_images=False):
    if not text:
        return ""
    pattern = r'(<\|ref\|>(.*?)<\|/ref\|><\|det\|>(.*?)<\|/det\|>)'
    matches = re.findall(pattern, text, re.DOTALL)
    img_num = 0

    for match in matches:
        if '<|ref|>image<|/ref|>' in match[0]:
            if include_images:
                text = text.replace(match[0], f'\n\n**[Figure {img_num + 1}]**\n\n', 1)
                img_num += 1
            else:
                text = text.replace(match[0], '', 1)
        else:
            text = re.sub(rf'(?m)^[^\n]*{re.escape(match[0])}[^\n]*\n?', '', text)

    return text.strip()

def fetchModel():
  from huggingface_hub import snapshot_download
  snapshot_download(MODEL_NAME, local_dir=f'{MODEL_VOLUME_PATH}/{MODEL_NAME}')


model_image = (
    modal.Image.from_registry(
        "nvidia/cuda:12.1.0-devel-ubuntu22.04",
        add_python="3.11"
    )
    .entrypoint([])
    .apt_install("git")
    .uv_pip_install(
        "torch==2.5.1",
        "wheel",
        "transformers==4.46.0",
        "tokenizers==0.20.3",
        "einops==0.8.0",
        "addict==2.4.0",
        "easydict==1.13",
        "huggingface_hub[hf_xet]==0.26.2",
        "Pillow==10.4.0",
        "psutil",
        "packaging",
        "torchvision",
        "accelerate",
        extra_index_url="https://download.pytorch.org/whl/cu121",
    )
    .uv_pip_install("ninja==1.11.1.1")
    .uv_pip_install("https://github.com/Dao-AILab/flash-attention/releases/download/v2.6.3/flash_attn-2.6.3+cu123torch2.4cxx11abiFALSE-cp311-cp311-linux_x86_64.whl")
    .env({
        "HF_HOME": "/cache",
        "HF_XET_HIGH_PERFORMANCE": "1",
    })
    .run_function(fetchModel, volumes=volumes)
)

@app.cls(
    image=model_image,
    volumes=volumes,
    gpu="L4",
)
class DeepSeekOCR:
    @modal.enter()
    def load_model(self):
        from transformers import AutoModel, AutoTokenizer
        import torch

        self.tokenizer = AutoTokenizer.from_pretrained(
            f"{MODEL_VOLUME_PATH}/{MODEL_NAME}",
            trust_remote_code=True
        )
        self.model = AutoModel.from_pretrained(
            f"{MODEL_VOLUME_PATH}/{MODEL_NAME}",
            _attn_implementation='flash_attention_2',
            trust_remote_code=True,
            use_safetensors=True,
            torch_dtype=torch.bfloat16,
            device_map="cuda"
        ).eval()

    @modal.method()
    def extract_text(self, image_data: str, prompt: str = None) -> str:
        if prompt is None:
            prompt = "<image>\nConvert the document to markdown."

        if image_data.startswith('data:'):
            image_data = image_data.split(',', 1)[1]

        image_bytes = base64.b64decode(image_data)

        import tempfile
        import os
        import sys
        from io import StringIO

        temp_dir = tempfile.mkdtemp()

        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False, dir=temp_dir) as f:
            f.write(image_bytes)
            image_path = f.name

        output_dir = os.path.join(temp_dir, "output")
        os.makedirs(output_dir, exist_ok=True)

        stdout = sys.stdout
        sys.stdout = StringIO()

        self.model.infer(
            self.tokenizer,
            prompt=prompt,
            image_file=image_path,
            base_size=1024,
            image_size=640,
            crop_mode=True,
            output_path=output_dir
        )

        result = '\n'.join([l for l in sys.stdout.getvalue().split('\n')
                            if not any(s in l for s in ['image:', 'other:', 'PATCHES', '====', 'BASE:', '%|', 'torch.Size'])]).strip()
        sys.stdout = stdout

        cleaned_result = clean_output(result, include_images=False)
        return cleaned_result

    @modal.fastapi_endpoint(method="POST", docs=True)
    async def extract(self, request: ImageRequest) -> dict:
        """Extracts the text from the given image using OCR."""
        text = self.extract_text.local(request.image_data, request.prompt)
        return {"text": text}