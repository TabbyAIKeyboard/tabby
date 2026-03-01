export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold">AI Keyboard Backend API</h1>
      <p className="mt-4 text-lg text-gray-600">API server is running</p>
      <div className="mt-8">
        <h2 className="text-xl font-semibold">Available Endpoints:</h2>
        <ul className="mt-4 list-disc list-inside space-y-2">
          <li>/api/auth/signup</li>
          <li>/api/chat</li>
          <li>/api/completion</li>
          <li>/api/suggest</li>
          <li>/api/suggest-inline</li>
          <li>/api/speech</li>
          <li>/api/transcribe</li>
          <li>/api/voice-agent</li>
          <li>/api/voice-command</li>
          <li>/api/voice-generate</li>
          <li>/api/interview-copilot</li>
          <li>/api/interview-ghost-suggest</li>
          <li>/api/prep-mode</li>
          <li>/api/dashboard/stats</li>
          <li>/api/dashboard/analytics</li>
          <li>/api/conversations/*</li>
        </ul>
      </div>
    </main>
  )
}
