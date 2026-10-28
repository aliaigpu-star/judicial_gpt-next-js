'use client';

import LawAgentChat from '@/components/chat/LawAgentChat';
import { LAW_AGENTS } from '@/lib/lawAgents';

export default function FamilyLawPage() {
    return <LawAgentChat {...LAW_AGENTS.family} />;
}
