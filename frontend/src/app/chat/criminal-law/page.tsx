'use client';

import LawAgentChat from '@/components/chat/LawAgentChat';

const CRIMINAL_LAW_API_URL =
    process.env.NEXT_PUBLIC_CRIMINAL_LAW_AGENT_URL ||
    'https://criminallaw-judicial-gpt.in.ngrok.io';

export default function CriminalLawPage() {
    return (
        <LawAgentChat
            agentType="criminal"
            title="Criminal Law Agent"
            description="Ask questions on PPC, Cr.P.C., evidence, bail, and criminal procedure under Pakistani law."
            apiUrl={CRIMINAL_LAW_API_URL}
            accentColor="#d97706"
            portHint="7006"
            suggestedQueries={[
                'What are the grounds for bail under Section 497 Cr.P.C.?',
                'Explain the difference between cognizable and non-cognizable offences.',
                'What is the procedure for recording a FIR under Section 154 Cr.P.C.?',
                'Summarize the ingredients of Section 302 PPC.',
            ]}
        />
    );
}
