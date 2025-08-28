export async function ollamaEmbed(text: string): Promise<number[]> {
  const url = process.env.OLLAMA_EMBED_URL;
  if (!url) {
    throw new Error('OLLAMA_EMBED_URL is not set');
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    throw new Error(`Ollama embedding request failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.vector || data.embedding || [];
}

export default ollamaEmbed;

