"""
LLM abstraction layer.

Supports two providers:
  - "openai"  — OpenAI chat completions (GPT-4o by default)
  - "watsonx" — IBM watsonx.ai (Granite by default)

Usage:
    from llm.client import get_llm_response
    result = await get_llm_response(system_prompt, user_prompt)
"""

from config import settings


async def get_llm_response(system_prompt: str, user_prompt: str) -> str:
    """Send a prompt to the configured LLM and return the text response."""
    if settings.llm_provider == "watsonx":
        return await _watsonx(system_prompt, user_prompt)
    return await _openai(system_prompt, user_prompt)


async def _openai(system_prompt: str, user_prompt: str) -> str:
    from openai import AsyncOpenAI

    client = AsyncOpenAI(api_key=settings.openai_api_key)
    response = await client.chat.completions.create(
        model=settings.openai_model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.2,
    )
    return response.choices[0].message.content or ""


async def _watsonx(system_prompt: str, user_prompt: str) -> str:
    from ibm_watsonx_ai.foundation_models import ModelInference
    from ibm_watsonx_ai.credentials import Credentials

    credentials = Credentials(
        url=settings.watsonx_url,
        api_key=settings.watsonx_api_key,
    )
    model = ModelInference(
        model_id=settings.watsonx_model,
        credentials=credentials,
        project_id=settings.watsonx_project_id,
    )
    prompt = f"[SYSTEM]\n{system_prompt}\n\n[USER]\n{user_prompt}"
    response = model.generate_text(prompt=prompt)
    return response
