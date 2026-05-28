import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string;

export interface AiScanResult {
  name: string;
  type: string;
  width: number;
  height: number;
  depth: number;
  doors: number;
  drawers: number;
  shelves: number;
  hasLegs: boolean;
  color: string;
  description: string;
}

const PROMPT = `
Та тавилга эсвэл гал тогооны шүүгээний зургийг шинжилж байна.
Зургаас дараах мэдээллийг JSON форматаар гаргана уу.

Буцаах JSON бүтэц (зөвхөн JSON, өөр текст байхгүй):
{
  "name": "тавилгын нэр монголоор",
  "type": "wardrobe | kitchen_lower | kitchen_upper | bookshelf | cabinet | fridge | sink | dishwasher | oven | microwave | cooktop | hood | custom",
  "width": хэмжээ_мм (200-3000),
  "height": хэмжээ_мм (200-2800),
  "depth": хэмжээ_мм (200-1000),
  "doors": хаалганы_тоо (0-6),
  "drawers": шургуулганы_тоо (0-6),
  "shelves": тавиурын_тоо (0-8),
  "hasLegs": хөлтэй_эсэх (true/false),
  "color": hex_өнгө (#ffffff гэх мэт),
  "description": "товч тайлбар монголоор"
}

Хэмжээг тааварлахдаа:
- Гал тогооны доод шүүгээ: өндөр ~850мм, гүн ~600мм
- Гал тогооны дээд шүүгээ: өндөр ~700мм, гүн ~350мм
- Шкаф/Wardobe: өндөр ~2200мм, гүн ~600мм
- Номын тавиур: өндөр ~1800мм, гүн ~300мм
- Хэрэв зурагт хэмжээ харагдаж байвал тэр хэмжээг ашигла
`;

export async function scanFurnitureImage(file: File): Promise<AiScanResult> {
  if (!API_KEY || API_KEY === 'энд_өөрийн_түлхүүрийг_оруулна') {
    throw new Error('GEMINI_API_KEY тохируулагдаагүй байна. .env файлд VITE_GEMINI_API_KEY= гэж оруулна уу.');
  }

  // Convert file to base64
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]); // strip "data:image/...;base64,"
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel(
    { model: 'gemini-2.5-flash' },
    { apiVersion: 'v1beta' }
  );

  const result = await model.generateContent([
    PROMPT,
    {
      inlineData: {
        mimeType: file.type as 'image/jpeg' | 'image/png' | 'image/webp',
        data: base64,
      },
    },
  ]);

  const text = result.response.text().trim();

  // Extract JSON from response (handle markdown code blocks)
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) ||
                    text.match(/```\s*([\s\S]*?)\s*```/) ||
                    text.match(/(\{[\s\S]*\})/);

  if (!jsonMatch) {
    throw new Error('AI хариу зөв JSON биш байна: ' + text.substring(0, 200));
  }

  const parsed = JSON.parse(jsonMatch[1]);

  // Validate and clamp values
  return {
    name: parsed.name || 'AI Танисан Тавилга',
    type: parsed.type || 'custom',
    width: Math.min(3000, Math.max(200, Number(parsed.width) || 800)),
    height: Math.min(2800, Math.max(200, Number(parsed.height) || 800)),
    depth: Math.min(1000, Math.max(200, Number(parsed.depth) || 400)),
    doors: Math.min(6, Math.max(0, Number(parsed.doors) || 0)),
    drawers: Math.min(6, Math.max(0, Number(parsed.drawers) || 0)),
    shelves: Math.min(8, Math.max(0, Number(parsed.shelves) || 0)),
    hasLegs: Boolean(parsed.hasLegs),
    color: /^#[0-9a-fA-F]{6}$/.test(parsed.color) ? parsed.color : '#f0ede8',
    description: parsed.description || '',
  };
}
