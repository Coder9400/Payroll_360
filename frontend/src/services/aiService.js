export const aiService = {
  async generateLeaveMessage(leaveType, startDate, endDate, basicReason) {
    try {
      const response = await fetch(import.meta.env.VITE_API_BASE_URL + "/ai/generate-leave", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Auth header is passed if using interceptors or can be omitted if it's public for now.
          // Since it's a simple feature, we will just send it directly.
        },
        body: JSON.stringify({
          leaveType,
          startDate,
          endDate,
          reason: basicReason
        })
      });

      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to generate message from AI.");
      }

      return data.message.trim();
    } catch (error) {
      console.error("AI Generation Error:", error);
      throw error;
    }
  }
};
