import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { authOptions } from "../auth/[...nextauth]/route";

const preprocessarEdital = (textoBruto) => {
  let textoLimpo = textoBruto.replace(/\s+/g, ' ').replace(/_{3,}|-{3,}|\.{3,}/g, '').replace(/Página \d+ de \d+/gi, '').trim();
  const valores = [...new Set(textoLimpo.match(/R\$\s?[\d\.]+,\d{2}/g) || [])];
  const datas = [...new Set(textoLimpo.match(/\d{2}\/\d{2}\/\d{4}/g) || [])];
  return { textoComprimido: textoLimpo, dadosExtraidos: { valores, datas } };
};

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions); 
    if (!session) return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });

    const body = await req.json();
    const { textContext, userQuestion, isJson } = body;
    if (!textContext) return NextResponse.json({ error: "Documento ausente." }, { status: 400 });

    const apiKey = process.env.GEMINI_API_KEY;
    const { textoComprimido, dadosExtraidos } = preprocessarEdital(textContext);
    let promptFinal = "";

    if (isJson) {
      promptFinal = `Você é um Motor de Inteligência Estratégica em Licitações (Lei 14.133). Forneça vantagem competitiva.
[DADOS PRÉ-EXTRAÍDOS] Valores: ${dadosExtraidos.valores.join(' | ') || "Nenhum"} | Datas: ${dadosExtraidos.datas.join(' | ') || "Nenhuma"}
Confronte o texto com a Lei 14.133. Procure exigências abusivas. Gere ESTRITAMENTE o JSON abaixo (sem markdown json):
{
  "orgao": "Nome do Órgão", "modalidade": "Modalidade", "objeto": "Resumo", "valorEstimado": "R$ X", "score": 75,
  "resumoExecutivo": "Diagnóstico",
  "vulnerabilidades": [{"id": "V01", "titulo": "...", "gravidade": "Crítica/Alta/Média", "descricao": "...", "impactoEstrategico": "...", "baseLegal": "...", "acaoRecomendada": "..."}],
  "oportunidadesOfensivas": [{"titulo": "...", "descricao": "...", "fundamento": "..."}],
  "prazos": [{"tipo": "...", "data": "...", "urgencia": "alta/media/baixa"}],
  "checklist": [{"categoria": "Habilitação", "itens": [{"item": "...", "alerta": true}]}],
  "minutaImpugnacao": "Esqueleto formal", "proximosPassos": ["..."]
}
TEXTO: ${textoComprimido.slice(0, 25000)}`;
    } else {
      promptFinal = `Responda ESTRITAMENTE com base no contexto. Se não estiver no texto, diga: "Informação não consta no edital."
TEXTO: ${textoComprimido.slice(0, 20000)}
PERGUNTA: ${userQuestion}`;
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: promptFinal }] }], generationConfig: { temperature: 0.1, ...(isJson && { responseMimeType: "application/json" }) } })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message);
    return NextResponse.json({ result: data.candidates[0].content.parts[0].text });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
