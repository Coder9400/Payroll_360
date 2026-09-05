import os
import sys
import json
from huggingface_hub import InferenceClient

def generate_leave_message():
    try:
        # Read JSON input from stdin
        input_data = sys.stdin.read()
        data = json.loads(input_data)
        
        leave_type = data.get('leaveType', 'Time off')
        start_date = data.get('startDate', 'Not specified')
        end_date = data.get('endDate', 'Not specified')
        reason = data.get('reason', 'No specific reason provided')
        
        prompt = f"""Write a professional and concise leave request message for an employee to send to their manager.
Details:
- Leave Type: {leave_type}
- Start Date: {start_date}
- End Date: {end_date}
- Context/Basic Reason provided by employee: "{reason}"

Make it polite, professional, and ready to send.
Do not include placeholders like "[Your Name]", just provide the message body. Do not add any introductory or concluding chat like "Here is your message:". Just return the exact message."""

        client = InferenceClient(api_key=os.getenv("HF_TOKEN"))
        
        response = client.chat.completions.create(
            model="meta-llama/Llama-3.1-8B-Instruct",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=250
        )
        
        output = response.choices[0].message.content.strip()
        print(json.dumps({"success": True, "message": output}))
        
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))

if __name__ == "__main__":
    generate_leave_message()
