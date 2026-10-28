'use client';

import LawAgentChat from '@/components/chat/LawAgentChat';

const CIVIL_LAW_API_URL =
    process.env.NEXT_PUBLIC_CIVIL_LAW_AGENT_URL ||
    'https://civillaw-judicial-gpt.in.ngrok.io';

export default function CivilLawPage() {
    return (
        <LawAgentChat
            agentType="civil"
            title="Civil Law Agent"
            description="Ask questions on civil procedure, contracts, property, family, and torts under Pakistani law."
            apiUrl={CIVIL_LAW_API_URL}
            accentColor="#0ea5e9"
            portHint="7005"
            suggestedQueries={[
                'What are the essentials of a valid contract under the Contract Act?',
                'Explain the procedure for filing a civil suit under the CPC.',
                'What is the limitation period for a suit for recovery of money?',
                'How is temporary injunction granted under Order 39 CPC?',
            ]}
        />
    );
}
