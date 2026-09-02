'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

const FAQS: { question: string; answer: string }[] = [
  {
    question: 'Do you store my notes forever?',
    answer:
      'No. Every note is stored with an expiration you choose at creation  -  anywhere from a few minutes to several days. Once that time passes, or once you delete it manually, it is permanently removed from the database. There is no backup or archive copy kept anywhere.',
  },
  {
    question: 'What happens if I lose the private key on a protected note?',
    answer:
      'The note becomes unrecoverable. When you set a private key, the note is encrypted using a key derived from that passphrase, and the server never stores it. This is intentional  -  it means nobody, including us, can read a protected note without the key you set.',
  },
  {
    question: 'Do I need an account to use LevPriv?',
    answer:
      'No. There are no accounts, no sign-ups, and no passwords to remember for the service itself. Ownership of a note is handled through a private management link generated when you create it  -  keep that link if you want to check its status or delete it early.',
  },
  {
    question: 'What is "delete after being read once"?',
    answer:
      'It is an option that overrides the timer entirely. If enabled, the note is permanently destroyed the moment someone successfully opens it  -  even if its original countdown had days left. Useful for anything meant to be seen exactly once.',
  },
  {
    question: 'Can I extend a note after creating it?',
    answer:
      'Yes, from the management link generated when you created the note. You can add 10 minutes, 1 hour, or 24 hours to its remaining lifespan at any time before it expires.',
  },
  {
    question: 'Is my note visible to anyone besides the person I share the link with?',
    answer:
      'Only whoever holds the link can open a note, and if you set a private key, they need that too. Content is encrypted before storage, so even direct access to the underlying database would not reveal readable note content.',
  },
  {
    question: 'What is the "My notes" dashboard, and does it require login?',
    answer:
      'It does not require login. It reads a list kept in your browser\u2019s local storage of notes you have created on this device, so you can check their status or delete them without digging up individual links. Clearing your browser data clears this list, but it does not affect the notes themselves.',
  },
]

export default function FaqPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <main className="flex-1 px-6 py-16">
      <div className="w-full max-w-2xl mx-auto animate-fadeIn">
        <h1 className="font-display text-3xl tracking-tight mb-3">Frequently asked questions</h1>
        <p className="text-base-muted text-sm mb-10">
          Everything worth knowing before you share something private.
        </p>

        <div className="border-t border-base-border">
          {FAQS.map((item, index) => {
            const isOpen = openIndex === index
            return (
              <div key={item.question} className="border-b border-base-border">
                <button
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="w-full flex items-center justify-between gap-4 py-5 text-left"
                >
                  <span className="text-sm text-base-white">{item.question}</span>
                  <ChevronDown
                    size={16}
                    className={`shrink-0 text-base-muted transition-transform duration-200 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <p className="text-sm text-base-muted leading-relaxed pb-5 pr-8 animate-fadeIn">
                    {item.answer}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </main>
  )
}
