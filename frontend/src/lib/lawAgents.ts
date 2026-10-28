export type LawAgentType = 'civil' | 'criminal' | 'family';

/** Settings for each Law Agent page; also used to reopen a saved agent conversation. */
export const LAW_AGENTS: Record<LawAgentType, {
    agentType: LawAgentType;
    title: string;
    description: string;
    apiUrl: string;
    accentColor: string;
    portHint: string;
    suggestedQueries: string[];
}> = {
    civil: {
        agentType: 'civil',
        title: 'Civil Law Agent',
        description: 'Ask questions on civil procedure, contracts, property, family, and torts under Pakistani law.',
        apiUrl: process.env.NEXT_PUBLIC_CIVIL_LAW_AGENT_URL || 'https://civillaw-judicial-gpt.in.ngrok.io',
        accentColor: '#0ea5e9',
        portHint: '7005',
        suggestedQueries: [
            'What are the essentials of a valid contract under the Contract Act?',
            'Explain the procedure for filing a civil suit under the CPC.',
            'What is the limitation period for a suit for recovery of money?',
            'How is temporary injunction granted under Order 39 CPC?',
        ],
    },
    criminal: {
        agentType: 'criminal',
        title: 'Criminal Law Agent',
        description: 'Ask questions on PPC, Cr.P.C., evidence, bail, and criminal procedure under Pakistani law.',
        apiUrl: process.env.NEXT_PUBLIC_CRIMINAL_LAW_AGENT_URL || 'https://criminallaw-judicial-gpt.in.ngrok.io',
        accentColor: '#d97706',
        portHint: '7006',
        suggestedQueries: [
            'What are the grounds for bail under Section 497 Cr.P.C.?',
            'Explain the difference between cognizable and non-cognizable offences.',
            'What is the procedure for recording a FIR under Section 154 Cr.P.C.?',
            'Summarize the ingredients of Section 302 PPC.',
        ],
    },
    family: {
        agentType: 'family',
        title: 'Family Law Agent',
        description: 'Ask questions on nikah, talaq, khula, custody, maintenance, dower, and succession under Pakistani family law.',
        apiUrl: process.env.NEXT_PUBLIC_FAMILY_LAW_AGENT_URL || 'https://familylawagent-judicial-gpt.in.ngrok.io',
        accentColor: '#db2777',
        portHint: '7007',
        suggestedQueries: [
            'What are the grounds for khula under the Dissolution of Muslim Marriages Act 1939?',
            'Explain the procedure for child custody (Hizanat) under Pakistani family law.',
            'What documents are required to file a maintenance suit for a wife and minor children?',
            'How is a talaq made effective under the Muslim Family Laws Ordinance 1961?',
        ],
    },
};

/** Agent conversations are saved with a title like "Civil Law: ..."; this finds the agent from it. */
export function agentTypeFromTitle(title?: string): LawAgentType | null {
    const match = title?.match(/^(Civil|Criminal|Family) Law: /);
    return match ? (match[1].toLowerCase() as LawAgentType) : null;
}
