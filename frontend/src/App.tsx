import { Routes, Route } from 'react-router-dom'
import MainLayout from './components/MainLayout'
import HomePage from './pages/HomePage'
import PostDetailPage from './pages/PostDetailPage'
import PostFormPage from './pages/PostFormPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ProfilePage from './pages/ProfilePage'
import UserProfilePage from './pages/UserProfilePage'
import ExplorePage from './pages/ExplorePage'
import LivePage from './pages/LivePage'
import GetVerifiedPage from './pages/GetVerifiedPage'
import CheckoutPage from './pages/CheckoutPage'
import CreatorDashboardPage from './pages/CreatorDashboardPage'
import CommunityPage from './pages/CommunityPage'
import ExploreCommunitiesPage from './pages/ExploreCommunitiesPage'
import CreateCommunityPage from './pages/CreateCommunityPage'
import StreamViewerPage from './pages/StreamViewerPage'
import SpheresPage from './pages/SpheresPage'

function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/posts/:slug" element={<PostDetailPage />} />
        <Route path="/posts/new" element={<PostFormPage />} />
        <Route path="/posts/:slug/edit" element={<PostFormPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/user/:username" element={<UserProfilePage />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/live" element={<LivePage />} />
        <Route path="/live/:id" element={<StreamViewerPage />} />
        <Route path="/get-verified" element={<GetVerifiedPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/dashboard" element={<CreatorDashboardPage />} />
        <Route path="/c/:slug" element={<CommunityPage />} />
        <Route path="/communities/discover" element={<ExploreCommunitiesPage />} />
        <Route path="/communities/new" element={<CreateCommunityPage />} />
      </Route>
      {/* Spheres (Nebula) Route - Outside MainLayout for Fullscreen Immersion */}
      <Route path="/spheres/:slug" element={<SpheresPage />} />
    </Routes>
  )
}

export default App
