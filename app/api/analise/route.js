import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { authOptions } from "../auth/[...nextauth]/route";

const preprocessarEdital = (textoBruto) => {
  let textoLimpo = textoBruto.replace(/\s+/g, ' ').replace(/_{3,}|-{3,}|\.{3,}/g, '').replace(/Página \d+ de \d+/gi, '').replace(/Este documento foi assinado digitalmente.*/gi, '').trim();
  const regexValor = /R\$\s?[\d\.]+,\d{2}/g;
  const regexData = /\d{2}\/\d{2}\/\d{4}/g;
  const regexCNPJ = /\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/g;
  return {
    textoComprimido: textoLimpo,
    dadosExtraidos: {
      valores: [...new Set(textoLimpo.match(regexValor) || [])],
      datas: [...new Set(textoLimpo.match(regexData) || [])],
      cnpjs: [...new Set(textoLimpo.match(regexCNPJ) || [])]
    }
  };
};

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions); 
    if (!session) return NextResponse.json({ error: "Sessão expirada." }, { status: 401 });

    const body = await req.json();
    const { textContext, userQuestion, isJson } = body;
    if (!textContext) return NextResponse.json({ error: "Documento ausente." }, { status: 400 });

    const apiKey = process.env.GEMINI_API_KEY;
    const { textoComprimido, dadosExtraidos } = preprocessarEdital(textContext);
    let promptFinal = "";

    if (isJson) {
      promptFinal = `Você é um Motor de Inteligência Estratégica em Licitações (Lei 14.133). Forneça vantagem competitiva.
[DADOS PRÉ-EXTRAÍDOS] Valores: ${dadosExtraidos.valores.join(' | ') || "Nenhum"} | Datas: ${dadosExtraidos.datas.join(' | ') || "Nenhuma"}
REGRAS DE BLINDAGEM JURÍDICA: 1. NUNCA faça promessas de resultado. 2. Use sempre linguagem condicional.
Gere o resultado ESTRITAMENTE em formato JSON puro:
{
  "orgao": "Nome do Órgão", "modalidade": "Modalidade", "objeto": "Resumo", "valorEstimado": "R$ X", "score": 75,
  "resumoExecutivo": "Diagnóstico tático focando no nível de exigência, em tom condicional.",
  "vulnerabilidades": [{"id": "V01", "titulo": "...", "gravidade": "Crítica/Alta/Média", "descricao": "...", "impactoEstrategico": "...", "baseLegal": "...", "acaoRecomendada": "..."}],
  "oportunidadesOfensivas": [{"titulo": "...", "descricao": "...", "fundamento": "..."}],
  "prazos": [{"tipo": "...", "data": "...", "urgencia": "alta/media/baixa"}],
  "checklist": [{"categoria": "Habilitação", "itens": [{"item": "...", "alerta": true}]}],
  "minutaImpugnacao": "Esqueleto formal", "proximosPassos": ["..."]
}
TEXTO: ${textoComprimido.slice(0, 25000)}`;
    } else {
      promptFinal = `Você é um Assistente Estratégico. Responda ESTRITAMENTE com base no contexto. Não garanta vitórias.
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
