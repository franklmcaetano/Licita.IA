import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { authOptions } from "../auth/[...nextauth]/route";

// 1. O "ESPREMEDOR": Minificação e Extração a custo zero
const preprocessarEdital = (textoBruto) => {
  let textoLimpo = textoBruto
    .replace(/\s+/g, ' ') // Esmaga quebras de linha e espaços duplos
    .replace(/_{3,}|-{3,}|\.{3,}/g, '') // Remove linhas de assinatura
    .replace(/Página \d+ de \d+/gi, '') // Remove paginação que confunde a IA
    .replace(/Este documento foi assinado digitalmente.*/gi, '') // Remove rodapés
    .trim();

  // Puxa padrões numéricos exatos para injetar no cérebro da IA
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
    // Bloqueio de Segurança: Apenas utilizadores com JWT autêntico passam
    const session = await getServerSession(authOptions); 
    if (!session) {
      return NextResponse.json({ error: "Sessão expirada ou não autorizada. Faça login novamente." }, { status: 401 });
    }

    const body = await req.json();
    const { textContext, userQuestion, isJson } = body;

    if (!textContext) {
      return NextResponse.json({ error: "Documento ausente." }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("Falha de configuração no servidor central.");

    // Processa a compressão do documento
    const { textoComprimido, dadosExtraidos } = preprocessarEdital(textContext);
    let promptFinal = "";

    if (isJson) {
      // PROMPT DA AUDITORIA INICIAL (Com Escudo Semântico e Blindagem Jurídica)
      promptFinal = `Você é um Motor de Inteligência Estratégica em Licitações (Lei 14.133 e TCU).
A sua função é fornecer vantagem decisiva através da análise tática.

[DADOS PRÉ-EXTRAÍDOS PELO SISTEMA CENTRAL]
Valores Identificados: ${dadosExtraidos.valores.join(' | ') || "Nenhum valor padrão encontrado"}
Datas Críticas: ${dadosExtraidos.datas.join(' | ') || "Nenhuma data padrão encontrada"}
CNPJs/Órgãos: ${dadosExtraidos.cnpjs.join(' | ') || "Nenhum CNPJ padrão encontrado"}

REGRAS DE BLINDAGEM JURÍDICA (CRÍTICO):
1. NUNCA faça promessas de resultado, ganho de causa ou garantias absolutas de sucesso.
2. É ESTRITAMENTE PROIBIDO usar palavras como "garantido", "com certeza", "infalível" ou "vitória".
3. Use sempre linguagem condicional, técnica e probabilística (ex: "Há indícios de restrição", "A jurisprudência sugere a possibilidade de impugnação", "Recomenda-se avaliar a viabilidade de...").

[O SEU TRABALHO]
Confronte o texto comprimido abaixo com a Lei 14.133. Procure exigências abusivas, restrições de marcas ou falhas de habilitação. Gere o resultado ESTRITAMENTE em formato JSON puro (sem markdown \`\`\`json):

{
  "orgao": "Nome do Órgão", 
  "modalidade": "Modalidade", 
  "objeto": "Resumo tático", 
  "valorEstimado": "R$ X ou Informação não localizada",
  "score": 75, 
  "resumoExecutivo": "Diagnóstico tático focando no nível de exigência, sempre em tom condicional.",
  "vulnerabilidades": [{"id": "V01", "titulo": "...", "gravidade": "Crítica/Alta/Média", "descricao": "...", "impactoEstrategico": "...", "baseLegal": "...", "acaoRecomendada": "..."}],
  "oportunidadesOfensivas": [{"titulo": "...", "descricao": "...", "fundamento": "..."}],
  "prazos": [{"tipo": "...", "data": "...", "urgencia": "alta/media/baixa"}],
  "checklist": [{"categoria": "Habilitação", "itens": [{"item": "...", "alerta": true}]}],
  "minutaImpugnacao": "Esqueleto formal de impugnação (sem garantias de deferimento)",
  "proximosPassos": ["..."]
}

TEXTO COMPRIMIDO:
${textoComprimido.slice(0, 25000)}`;

    } else {
      // PROMPT DO CHAT INTERATIVO (Com Trava de Responsabilidade)
      promptFinal = `Você é um Assistente Estratégico Especializado em Licitações.
REGRAS DE BLINDAGEM JURÍDICA: Não garanta vitórias processuais. Use sempre linguagem condicional.
Responda ESTRITAMENTE com base no contexto comprimido abaixo.
Se a informação não estiver no texto, declare: "Lamento, mas essa informação não consta no edital analisado."

CONTEXTO DO EDITAL COMPRIMIDO:
${textoComprimido.slice(0, 20000)}

PERGUNTA DO USUÁRIO:
${userQuestion}`;
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptFinal }] }],
        generationConfig: { 
          temperature: 0.1,
          ...(isJson && { responseMimeType: "application/json" })
        }
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "Erro no processamento da Inteligência Artificial.");
    if (!data.candidates || !data.candidates[0]) throw new Error("A IA não retornou uma resposta estruturada.");

    return NextResponse.json({ result: data.candidates[0].content.parts[0].text });

  } catch (error) {
    console.error("Erro interno:", error);
    return NextResponse.json({ error: error.message || "Falha na comunicação segura." }, { status: 500 });
  }
}
