import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import PostDetailPage from './pages/PostDetailPage'
import PostFormPage from './pages/PostFormPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ProfilePage from './pages/ProfilePage'
import UserProfilePage from './pages/UserProfilePage'
import ExplorePage from './pages/ExplorePage'
import LivePage from './pages/LivePage'
import StreamViewerPage from './pages/StreamViewerPage'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
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
      </Route>
    </Routes>
  )
}

export default App
