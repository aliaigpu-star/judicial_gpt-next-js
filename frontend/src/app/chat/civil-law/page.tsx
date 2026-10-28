'use client';

import LawAgentChat from '@/components/chat/LawAgentChat';
import { LAW_AGENTS } from '@/lib/lawAgents';

export default function CivilLawPage() {
    return <LawAgentChat {...LAW_AGENTS.civil} />;
}
