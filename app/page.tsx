import { getServerSession } from 'next-auth/next';

import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { Hero } from '@/components/Hero';
import { HowItWorks } from '@/components/HowItWorks';
import { ImportantNotes } from '@/components/ImportantNotes';
import { VoiceVolumeController } from '@/components/VoiceVolumeController';
import { WelcomeCard } from '@/components/WelcomeCard';

export default async function Home() {
  const session = await getServerSession(authOptions);

  return (
    <div className="relative flex min-h-screen flex-col">
      <div className="jmv-bg-mesh" aria-hidden="true" />
      <div className="relative z-10 flex flex-1 flex-col">
        <Header />

        <main className="container mx-auto flex-1 px-4 py-10 sm:py-14">
          {session ? (
            <div className="mx-auto max-w-3xl space-y-12">
              <Hero />
              <div className="rounded-xl border border-line bg-bg-elevated/70 p-6 shadow-card backdrop-blur-sm sm:p-8">
                <VoiceVolumeController />
              </div>
              <HowItWorks />
              <ImportantNotes />
            </div>
          ) : (
            <div className="flex min-h-[60vh] items-center justify-center">
              <WelcomeCard />
            </div>
          )}
        </main>

        <Footer />
      </div>
    </div>
  );
}
