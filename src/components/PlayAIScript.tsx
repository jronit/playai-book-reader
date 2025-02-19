'use client'

import Script from 'next/script'

const AGENT_ID = 'VA-vkEBRymCy3oH8dvU8Yhem'

export default function PlayAIScript() {
  return (
    <>
      <Script id="playai-context-handler" strategy="afterInteractive">
        {`
          window.addEventListener('playai:update-context', (event) => {
            if (window.PlayAI && window.PlayAI.updateContext) {
              window.PlayAI.updateContext(event.detail.prompt);
            }
          });
        `}
      </Script>
      <Script
        id="playai-embed"
        src="https://cdn.play.ai/embed/v1/embed.js"
        strategy="afterInteractive"
        onLoad={() => {
          if (typeof window !== 'undefined' && window.PlayAI) {
            window.PlayAI.init({
              agentId: AGENT_ID,
              containerId: 'playai-widget',
              apiKey: process.env.NEXT_PUBLIC_PLAY_AI_SECRET_KEY,
              userId: process.env.NEXT_PUBLIC_PLAY_AI_USER_ID,
            })
          }
        }}
      />
    </>
  )
} 