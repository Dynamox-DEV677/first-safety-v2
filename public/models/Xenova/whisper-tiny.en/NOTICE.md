# Whisper tiny.en (ONNX), served by First Safety

These files are the speech model First Safety runs on the phone for voice input. They are served
from this site so that voice never contacts a third party.

- Model: Whisper tiny.en, by OpenAI (`openai/whisper-tiny.en`).
- ONNX export and quantisation: Xenova, Hugging Face repository `Xenova/whisper-tiny.en`,
  revision `79fb389fc764e7c395bd330e9531d9d32ada7049`.
- Licence: Apache License 2.0 (copy in `LICENSE`, next to this file).
- The files are unmodified copies of that revision: `config.json`, `generation_config.json`,
  `preprocessor_config.json`, `tokenizer.json`, `tokenizer_config.json`,
  `onnx/encoder_model_quantized.onnx` and `onnx/decoder_model_merged_quantized.onnx`.
