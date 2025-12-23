import modal
from pathlib import Path

app = modal.App()

MODEL_NAME="deepseek-ai/DeepSeek-OCR"
MODEL_VOLUME_PATH = Path("/model")
MODEL_VOLUME = modal.Volume.from_name("model-cache", create_if_missing=True)
volumes = {MODEL_VOLUME_PATH: MODEL_VOLUME}

def fetchModel():
  from huggingface_hub import snapshot_download
  snapshot_download(MODEL_NAME, local_dir=f'{MODEL_VOLUME_PATH}/{MODEL_NAME}')

model_image = (
    modal.Image.debian_slim(python_version="3.11")
    .uv_pip_install(
        "torch==2.7.1",
        "transformers==4.54.1",
        "flash-attn==2.7.4",
        "safetensors==0.4.5",
        "pillow==11.0.0",
        "fastapi[standard]==0.115.4",
        "pydantic==2.9.2",
        extra_index_url="https://download.pytorch.org/whl/cu121",
    )
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
    gpu="A100", # overkill? maybe, but F it
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
            prompt = "<image>\n<|grounding|>Convert the document to markdown."

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
    def web(self, image: bytes, prompt: str = None) -> dict:
        """Endpoint web"""
        text = self.extract_text.local(image, prompt)
        return {"text": text}