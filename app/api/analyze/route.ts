import { Anthropic } from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface AnalysisRequest {
  originalContract: string;
  newRequest: string;
}

interface AnalysisResponse {
  verdict: 'In Scope' | 'Out of Scope' | 'Gray Area';
  explanation: string;
  clientResponse: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: AnalysisRequest = await request.json();
    const { originalContract, newRequest } = body;

    if (!originalContract || !newRequest) {
      return NextResponse.json(
        { error: 'Both originalContract and newRequest are required' },
        { status: 400 }
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY is not configured' },
        { status: 500 }
      );
    }

    const systemPrompt = `You are ScopeShield, a scope-creep detection engine. You analyze an original contract/SOW against a new client request. Return a JSON object with three fields: verdict (exactly one of: 'In Scope', 'Out of Scope', 'Gray Area'), explanation (2 sentences max explaining why), and clientResponse (a professional, firm but friendly message the freelancer can send to their client about this request). Be precise and practical.`;

    const userPrompt = `Original Contract/SOW:
${originalContract}

New Client Request:
${newRequest}

Please analyze if the new request falls within scope.`;

    const message = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    const responseText =
      message.content[0].type === 'text' ? message.content[0].text : '';

    let analysisResult: AnalysisResponse;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      analysisResult = JSON.parse(jsonMatch[0]);
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse Claude response' },
        { status: 500 }
      );
    }

    if (!analysisResult.verdict || !analysisResult.explanation || !analysisResult.clientResponse) {
      return NextResponse.json(
        { error: 'Invalid response format from Claude' },
        { status: 500 }
      );
    }

    return NextResponse.json(analysisResult);
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze request' },
      { status: 500 }
    );
  }
}
