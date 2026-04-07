import os
from openai import OpenAI

# It is strongly recommended to use environment variables for API keys.
# os.environ["OPENAI_API_KEY"] = "YOUR_API_KEY" 
client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

def generate_python_script(user_prompt: str) -> str:
    """
    Generates a Python script using OpenAI's GPT model based on a user prompt.
    """
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY environment variable not set.")
    
    client = OpenAI(api_key=api_key)
    
    try:
        model = os.environ.get("OPENAI_MODEL", "gpt-4")
        response = client.chat.completions.create(
            model=model,  # Allow override via env OPENAI_MODEL
            messages=[
                {"role": "system", "content": "You are a Python code generator. Your purpose is to return only valid, runnable Python code based on the user's request. Do not include any explanatory text, markdown formatting, or anything other than the code itself."},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.2
        )
        # The response content should be just the code
        script_content = response.choices[0].message.content
        
        # Clean up the response to ensure it's just code
        if script_content.startswith("```python"):
            script_content = script_content[len("```python"):].strip()
        if script_content.endswith("```"):
            script_content = script_content[:-len("```")].strip()
            
        return script_content

    except Exception as e:
        # Avoid leaking full stack or API internals to client; return concise error
        msg = str(e)
        if "api_key" in msg.lower():
            msg = "OpenAI API key missing or invalid"
        print(f"An error occurred while calling OpenAI API: {e}")
        return f"# An error occurred: {msg}"

if __name__ == '__main__':
    # Example usage:
    prompt = "Create a Python function that takes a list of strings and returns a new list with all strings in uppercase."
    generated_script = generate_python_script(prompt)
    print("Generated Script:")
    print(generated_script)
