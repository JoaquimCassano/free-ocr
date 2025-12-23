import modal
from pathlib import Path
from typing import Literal

app = modal.App()

MODEL_NAME="deepseek-ai/DeepSeek-OCR"
MODEL_VOLUME_PATH = Path("/model")
MODEL_VOLUME = modal.Volume.from_name("model-cache", create_if_missing=True)
volumes = {MODEL_VOLUME_PATH: MODEL_VOLUME}

def fetchModel():
  from huggingface_hub import snapshot_download
  snapshot_download(MODEL_NAME, local_dir=f'{MODEL_VOLUME_PATH}/{MODEL_NAME}')


cuda_version = "12.1.0"
flavor = "devel"
operating_sys = "ubuntu22.04"
tag = f"{cuda_version}-{flavor}-{operating_sys}"

model_image = (
    modal.Image.from_registry(f"nvidia/cuda:{tag}", add_python="3.11")
    .entrypoint([])
    .uv_pip_install(
        "torch",
        "transformers==4.47.1",
        "tokenizers",
        "einops",
        "addict",
        "easydict",
        "huggingface_hub",
        "wheel",
        "pillow",
        "matplotlib",
        "torchvision",
        extra_index_url="https://download.pytorch.org/whl/cu121",
    )
    .uv_pip_install(
       "flash-attn", extra_options="--no-build-isolation")
    .env(
        {
            "HF_HOME": "/cache",
            "HF_XET_HIGH_PERFORMANCE": "1",
        }
    )
    .run_function(
        fetchModel,
        volumes=volumes
    )
)

@app.cls(
    image=model_image,
    gpu="L4", # overkill? maybe, but F it
    volumes=volumes,
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
            use_safetensors=True
        )
        self.model = self.model.eval().cuda().to(torch.bfloat16)

    @modal.method()
    def extract_text(self, image_bytes: bytes, prompt: str = None) -> str:
        if prompt is None:
            prompt = "<image>\n>Convert the document to markdown."

        import tempfile
        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as f:
            f.write(image_bytes)
            image_path = f.name

        result = self.model.infer(
            self.tokenizer,
            prompt=prompt,
            image_file=image_path,
            base_size=1024,
            image_size=640,
            crop_mode=True
        )
        return result

    @modal.fastapi_endpoint(method="POST", docs=True)
    async def extract(self, image: bytes, prompt: str = None) -> dict:
        """Extracts the text from the given image using OCR."""
        text = self.extract_text.local(image, prompt)
        return {"text": text}