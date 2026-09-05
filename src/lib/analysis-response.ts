// Platforms can return plain text/HTML on timeouts and rejected requests.
// Do not expose their raw body or a JSON parser exception to the user.
export async function readAnalysisResponse(response: Response) {
  const data = await response.json().catch(() => null);
  if (!response.ok || !data || typeof data !== "object") {
    const message = response.status === 401 ? "Please log in again to view your analysis."
      : typeof data?.error === "string" ? data.error
      : "Your analysis could not be loaded right now. Please try again.";
    throw new Error(message);
  }
  return data;
}
