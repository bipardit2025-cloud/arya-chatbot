import ollama

response = ollama.chat(
    model="arya",
    messages=[
        {
            "role": "user",
            "content": "Hello Arya"
        }
    ]
)

print(response["message"]["content"])