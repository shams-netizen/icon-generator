export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { prompt, ratio } = req.body;
  if (!prompt) return res.status(400).json({ error: 'prompt required' });

  const KIE_KEY = process.env.KIE_KEY;
  if (!KIE_KEY) return res.status(500).json({ error: 'KIE_KEY not configured' });

  try {
    const resp = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KIE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'nano-banana-pro',
        input: {
          prompt,
          aspect_ratio: ratio || '1:1',
          resolution: '1K',
          output_format: 'png',
        },
      }),
    });

    const data = await resp.json();
    if (!data?.data?.taskId) {
      return res.status(500).json({ error: 'No taskId returned', raw: data });
    }

    return res.status(200).json({ taskId: data.data.taskId });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
