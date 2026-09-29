import { useEffect, type ReactElement } from 'react'
import { match, useRoute } from './hooks/useRoute'
import { readLS, writeLS } from './hooks/useLocalStorage'
import { REMINDER_KEY, notifyIfDue, type ReminderSettings, type VaccineRecord } from './hooks/useVaccine'
import Header from './components/Header'
import Footer from './components/Footer'
import BottomNav from './components/BottomNav'
import ModeSelector from './components/ModeSelector'
import Sources from './components/Sources'
import Settings from './components/Settings'
import NotFound from './components/NotFound'
import TriageFlow from './now/TriageFlow'
import AnimalPicker from './now/AnimalPicker'
import ChecklistContainer from './now/ChecklistContainer'
import FinalScreen from './now/FinalScreen'
import HospitalFinder from './now/HospitalFinder'
import TopicSelector from './learn/TopicSelector'
import CardStack from './learn/CardStack'
import BookmarkedCards from './learn/BookmarkedCards'
import Faq from './learn/Faq'
import VideoList from './learn/VideoList'
import QuizHome from './quiz/QuizHome'
import QuizPlay from './quiz/QuizPlay'
import Profile from './profile/Profile'
import MedicalProfile from './profile/MedicalProfile'
import Leaderboard from './leaderboard/Leaderboard'
import Report from './report/Report'

export default function App() {
  const route = useRoute()
  const emergency = route.startsWith('/now')

  // Dose reminders have no server: check once per app start whether a dose is due.
  useEffect(() => {
    notifyIfDue(
      readLS<VaccineRecord | null>('fs.vaccine', null),
      readLS<ReminderSettings>(REMINDER_KEY, { enabled: false, lastNotified: '' }),
      (s) => writeLS(REMINDER_KEY, s),
    )
  }, [])

  // The doctor's report has no app chrome at all: white page, nothing else.
  if (route === '/report') return <Report />

  let page: ReactElement
  let onTimerScreen = false

  const stepMatch = match(route, '/now/step/:n')
  const topicMatch = match(route, '/learn/topic/:id')
  const quizMatch = match(route, '/learn/quiz/:difficulty')

  if (route === '/') page = <ModeSelector />
  else if (route === '/now/animal') page = <AnimalPicker />
  else if (route === '/now' || route === '/now/triage') page = <TriageFlow />
  else if (stepMatch) {
    const n = Number(stepMatch.n)
    onTimerScreen = n === 1
    page = <ChecklistContainer step={n} />
  } else if (route === '/now/go') page = <FinalScreen />
  else if (route === '/now/help') page = <HospitalFinder />
  else if (route === '/learn') page = <TopicSelector />
  else if (topicMatch) page = <CardStack topicId={topicMatch.id} />
  else if (route === '/learn/bookmarks') page = <BookmarkedCards />
  else if (route === '/learn/quiz') page = <QuizHome />
  else if (quizMatch) page = <QuizPlay key={quizMatch.difficulty} difficulty={quizMatch.difficulty} />
  else if (route === '/learn/faq') page = <Faq />
  else if (route === '/learn/videos') page = <VideoList />
  else if (route === '/profile') page = <Profile />
  else if (route === '/profile/medical') page = <MedicalProfile />
  else if (route === '/leaderboard') page = <Leaderboard />
  else if (route === '/settings') page = <Settings />
  else if (route === '/sources') page = <Sources />
  else page = <NotFound />

  return (
    <>
      <Header showMiniTimer={emergency && !onTimerScreen} />
      <main className={`page wrap ${emergency ? '' : 'has-nav'}`}>{page}</main>
      {/* The entry screen owns its viewport: two buttons and nothing under them. */}
      {!emergency && route !== '/' && <Footer />}
      {!emergency && <BottomNav route={route} />}
    </>
  )
}
