// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightLinksValidator from 'starlight-links-validator';
import starlightLlmsTxt from 'starlight-llms-txt';
import { focusableCode } from './src/lib/focusable-code.mjs';

// The one place the public address lives: canonical URLs, the sitemap, llms.txt and the changelog
// feed derive from it. DOCS_SITE overrides it for a deploy that serves another origin (a pages.dev
// preview) — page and asset links stay relative either way, so the build is the same; only the
// canonical/sitemap base moves.
const site = process.env.DOCS_SITE ?? 'https://docs.ai-operations-layer.404human.dev';
const repo = 'https://github.com/akira-shirase-oss/ai-operations-layer-docs';

export default defineConfig({
	site,
	trailingSlash: 'always',
	output: 'static',
	integrations: [
		starlight({
			title: 'AI Operations Layer Docs',
			description:
				'Documentation for the AI Operations Layer, the open-source observability and controlled-recovery layer for AI-backed applications: the quick start, instrumentation, the console, the HTTP API and self-hosting.',
			favicon: '/favicon.svg',
			social: [
				{ icon: 'github', label: 'AI Operations Layer on GitHub', href: 'https://github.com/akira-shirase-oss/ai-operations-layer' },
			],
			editLink: { baseUrl: `${repo}/edit/main/` },
			lastUpdated: true,
			pagination: true,
			credits: false,
			titleDelimiter: '·',
			tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 3 },
			customCss: ['./src/styles/theme.css'],
			head: [
				{ tag: 'link', attrs: { rel: 'alternate', type: 'application/rss+xml', title: 'AI Operations Layer changelog', href: `${site}/changelog/rss.xml` } },
				// An accessibility fix to Starlight's output: the search button shows "Search" and its
				// shortcut (⌘K or Ctrl K), so its name says both, as speech input reads them (WCAG 2.5.3).
				// Starlight swaps ⌘ for Ctrl off a Mac, sometimes after this runs, so the name follows
				// the shortcut's text whenever it changes; and a space separates the visible words
				// ("Search Ctrl K", not "SearchCtrlK"), so the name contains what is shown.
				// (Wide tables and code blocks take keyboard focus from the build instead, WCAG 2.1.1:
				// src/lib/focusable-code.mjs and scripts/focusable-tables.mjs, so they do without JavaScript too.)
				{
					tag: 'script',
					content:
						"document.addEventListener('DOMContentLoaded',()=>{for(const b of document.querySelectorAll('button[data-open-modal]')){const n=()=>{const p=[b.querySelector('span'),...b.querySelectorAll('kbd kbd')];for(const e of p.slice(0,-1))if(e&&e.nextSibling?.nodeValue!==' ')e.after(' ');const k=[...b.querySelectorAll('kbd kbd')].map(e=>e.textContent.trim()).join(' ');if(k)b.setAttribute('aria-label','Search '+k)};n();const s=b.querySelector('kbd');if(s)new MutationObserver(n).observe(s,{subtree:true,childList:true,characterData:true})}});",
				},
			],
			expressiveCode: {
				plugins: [focusableCode()],
				themes: ['github-dark-default', 'github-light-default'],
				styleOverrides: {
					borderRadius: '0.5rem',
				},
			},
			components: {
				PageTitle: './src/components/PageTitle.astro',
				Footer: './src/components/Footer.astro',
			},
			sidebar: [
				{
					label: 'Getting started',
					items: [
						{ label: 'Introduction', slug: 'index' },
						{ label: 'Quick start', slug: 'quick-start' },
						{ label: 'Concepts', slug: 'concepts' },
					],
				},
				{
					label: 'Instrumenting',
					items: [
						{ label: 'The Rust SDK', slug: 'instrument' },
						{ label: 'The ingest contract', slug: 'ingest-contract' },
						{ label: 'Durable Runner hosts', slug: 'adapters/durable-runner' },
					],
				},
				{
					label: 'Investigating',
					items: [{ label: 'The console', slug: 'console' }],
				},
				{
					label: 'HTTP API',
					items: [
						{ label: 'Which API, when', slug: 'api' },
						{ label: 'Authentication and keys', slug: 'api/authentication' },
						{ label: 'Errors', slug: 'errors' },
					],
				},
				{
					label: 'Self-hosting',
					items: [
						{ label: 'Configuration', slug: 'self-hosting/configuration' },
						{ label: 'Deployment', slug: 'self-hosting/deployment' },
						{ label: 'Backups and restore', slug: 'self-hosting/backups' },
						{ label: 'Capacity', slug: 'self-hosting/capacity' },
						{ label: 'Monitoring and operations', slug: 'self-hosting/monitoring' },
						{ label: 'Security', slug: 'self-hosting/security' },
						{ label: 'The admin CLI', slug: 'cli' },
					],
				},
				{ label: 'API reference', link: '/api/reference/', attrs: { 'data-reference': '' } },
				{ label: 'Changelog', link: '/changelog/' },
			],
			plugins: [
				starlightLinksValidator({ errorOnLocalLinks: true, exclude: ['/api/reference/', '/changelog/', '/changelog/**'] }),
				starlightLlmsTxt({
					projectName: 'AI Operations Layer',
					description:
						'The AI Operations Layer is an open-source add-on observability and controlled-recovery layer for AI-backed applications (a Rust collector plus SDK and a console): it correlates one operation from request through model, tool and job steps to its outcome, preserves uncertainty and telemetry gaps, and treats telemetry as evidence, never authority for retries, refunds or publication.',
				}),
			],
		}),
	],
});
