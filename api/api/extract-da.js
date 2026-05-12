export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { base64, filename, type } = req.body;
  if (!base64) return res.status(400).json({ error: 'base64 required' });

  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_KEY) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });

  const isImage = type?.startsWith('image/');
  const isPdf = type === 'application/pdf';

  const contentBlock = isPdf
    ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } }
    : isImage
    ? { type: 'image', source: { type: 'base64', media_type: type, data: base64 } }
    : null;

  if (!contentBlock) return res.status(400).json({ error: 'Unsupported file type' });

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: [
              contentBlock,
              {
                type: 'text',
                text: `Tu es expert en direction artistique et branding. Analyse ce document (charte graphique, brand book ou identité visuelle) et extrais les informations suivantes pour générer des icônes cohérentes avec la DA de la marque.

Réponds UNIQUEMENT en JSON valide, sans texte avant ni après, avec exactement ces clés :
{
  "da": "description du style graphique pour les icônes : type (flat, illustré, 3D, etc), formes, textures, caractéristiques visuelles distinctives — en 2-3 phrases",
  "palette": "couleurs principales en HEX séparées par des virgules, ex: #FF6B35, #004E89, #FFFFFF",
  "mood": "mots-clés décrivant l'univers et le ton de la marque, séparés par des virgules",
  "refs": "marques ou univers visuels similaires si identifiables, sinon chaîne vide"
}`
              }
            ]
          }
        ]
      }),
    });

    const data = await resp.json();
    const text = data.content?.find(b => b.type === 'text')?.text || '';

    let parsed;
    try {
      const clean = text.replace(/```json|```/g, '').trim();
      parsed = JSON.parse(clean);
    } catch {
      return res.status(200).json({ da: text, palette: '', mood: '', refs: '' });
    }

    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
