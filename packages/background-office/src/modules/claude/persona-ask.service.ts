import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ClaudeService } from './claude.service';
import { PersonaLoaderService } from './persona-loader.service';
import { GithubService } from '../github/github.service';
import { LinearService } from '../linear/linear.service';
import {
  buildPersonaUserMessage,
  contextRefLabel,
  PERSONA_META,
} from './persona-prompt.builder';
import type { ContextRef, PersonaAskBody, PersonaAskResponse } from '../../types/claude.types';

@Injectable()
export class PersonaAskService {
  private readonly logger = new Logger(PersonaAskService.name);

  constructor(
    @Inject(ClaudeService) private readonly claude: ClaudeService,
    @Inject(PersonaLoaderService) private readonly personas: PersonaLoaderService,
    @Inject(GithubService) private readonly github: GithubService,
    @Inject(LinearService) private readonly linear: LinearService,
  ) {}

  async askPersona(name: string, body: PersonaAskBody): Promise<PersonaAskResponse> {
    const persona = name.toLowerCase();
    const meta = PERSONA_META[persona];
    if (!meta) {
      throw new NotFoundException(`Unknown persona: ${name}`);
    }
    const personaPrompt = this.personas.getPersonaPromptFile(persona);
    if (!personaPrompt) {
      throw new BadRequestException(
        `Persona prompt not loaded for "${persona}" (run yarn prepare)`,
      );
    }

    const includeStrategicDocs = body.includeStrategicDocs !== false;

    let ticketBlock = '';
    let ticketSourceLabel = '';
    if (body.context) {
      const built = await this.resolveContext(body.context);
      ticketBlock = built.text;
      ticketSourceLabel = built.label;
    }

    const { text: userMessage } = buildPersonaUserMessage({
      persona,
      personaMeta: meta,
      personaPrompt,
      question: body.question,
      includeStrategicDocs,
      whitePaper: this.personas.getDocument('whitePaper'),
      architecture: this.personas.getDocument('architecture'),
      services: this.personas.getDocument('services'),
      ticketBlock,
      ticketSourceLabel,
    });

    const res = await this.claude.askWithUserText(userMessage);

    const sources: { document: string; length: number }[] = [
      { document: meta.promptLabel, length: personaPrompt.length },
    ];
    if (includeStrategicDocs) {
      const wp = this.personas.getDocument('whitePaper');
      if (wp) sources.push({ document: 'WHITE_PAPER.md', length: wp.length });
      const ar = this.personas.getDocument('architecture');
      if (ar) sources.push({ document: 'ARCHITECTURE.md', length: ar.length });
      const sv = this.personas.getDocument('services');
      if (sv) sources.push({ document: 'SERVICES.md', length: sv.length });
    }
    if (body.context) {
      sources.push({
        document: contextRefLabel(body.context),
        length: ticketBlock.length,
      });
    }

    this.logger.debug({ persona, sources: sources.map((s) => s.document) }, 'persona.ask done');

    return {
      text: res.text,
      persona,
      sources,
    };
  }

  private async resolveContext(
    ref: ContextRef,
  ): Promise<{ text: string; label: string }> {
    if (ref.source === 'raw') {
      return { text: ref.text.trim(), label: 'raw text' };
    }
    if (ref.source === 'github-issue') {
      const issue = await this.github.fetchIssueWithComments(ref.issueNumber);
      return {
        text: this.github.formatIssueAsTicket(issue),
        label: `GitHub Issue #${issue.number}: «${issue.title}»`,
      };
    }
    const issue = await this.linear.getIssueByIdentifier(ref.ticketId);
    return {
      text: this.linear.formatIssueForPrompt(issue),
      label: `Linear ${issue.identifier}: «${issue.title}»`,
    };
  }
}
