import os
from openai import OpenAI


def generate_python_script(user_prompt: str) -> str:
    """
    Generates a Python script using OpenAI's chat completions API.
    Model can be overridden via OPENAI_MODEL; key via OPENAI_API_KEY.
    Returns ONLY code (no fences). On error, returns a single-line
    Python comment starting with '# An error occurred: ...'.
    """
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY environment variable not set.")

    client = OpenAI(api_key=api_key)
    try:
        model = os.environ.get("OPENAI_MODEL", "gpt-4")
        response = client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a Python code generator. Return only valid, runnable Python code "
                        "based on the user's request. Do not include explanations or markdown."
                    ),
                },
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.2,
        )
        script_content = response.choices[0].message.content or ""
        # Strip code fences if present
        if script_content.startswith("```python"):
            script_content = script_content[len("```python"):].strip()
        if script_content.endswith("```"):
            script_content = script_content[: -len("```")].strip()
        return script_content
    except Exception as e:
        msg = str(e)
        if "api_key" in msg.lower():
            msg = "OpenAI API key missing or invalid"
        return f"# An error occurred: {msg}"
