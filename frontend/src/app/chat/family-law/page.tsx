'use client';

import LawAgentChat from '@/components/chat/LawAgentChat';

const FAMILY_LAW_API_URL =
    process.env.NEXT_PUBLIC_FAMILY_LAW_AGENT_URL ||
    'https://familylawagent-judicial-gpt.in.ngrok.io';

export default function FamilyLawPage() {
    return (
        <LawAgentChat
            agentType="family"
            title="Family Law Agent"
            description="Ask questions on nikah, talaq, khula, custody, maintenance, dower, and succession under Pakistani family law."
            apiUrl={FAMILY_LAW_API_URL}
            accentColor="#db2777"
            portHint="7007"
            suggestedQueries={[
                'What are the grounds for khula under the Dissolution of Muslim Marriages Act 1939?',
                'Explain the procedure for child custody (Hizanat) under Pakistani family law.',
                'What documents are required to file a maintenance suit for a wife and minor children?',
                'How is a talaq made effective under the Muslim Family Laws Ordinance 1961?',
            ]}
        />
    );
}
