import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import ToolsList from './pages/ToolsList'
import ToolPage from './pages/ToolPage'

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/tools" element={<ToolsList />} />
          <Route path="/tools/:toolId" element={<ToolPage />} />
        </Routes>
      </Layout>
    </Router>
  )
}

export default App