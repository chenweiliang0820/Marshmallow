import { useParams, Link } from 'react-router-dom'
import { tools } from '@/data/tools'
import ToolCanva from '@/tools/canva/ToolCanva'

export default function ToolPage() {
  const { toolId } = useParams<{ toolId: string }>()
  const tool = tools.find((t) => t.id === toolId)

  if (!tool) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center py-16">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-semibold text-gray-300 mb-2">工具不存在</h2>
          <p className="text-gray-500 mb-6">抱歉，找不到您要的工具</p>
          <Link
            to="/tools"
            className="inline-block px-6 py-3 bg-gradient-to-r from-neon-blue to-neon-purple text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-neon-blue/50 transition-all duration-300"
          >
            返回工具列表
          </Link>
        </div>
      </div>
    )
  }

  // Render tool component based on toolId
  const renderTool = () => {
    switch (toolId) {
      case 'canva':
        return <ToolCanva />
      default:
        return (
          <div className="glass-effect p-8 rounded-xl text-center">
            <div className="text-6xl mb-4">{tool.icon}</div>
            <h2 className="text-2xl font-semibold text-gray-100 mb-4">{tool.name}</h2>
            <p className="text-gray-400 mb-6">{tool.description}</p>
            <p className="text-gray-500 text-sm">
              此工具正在開發中，敬請期待！
            </p>
          </div>
        )
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Breadcrumb */}
      <nav className="mb-8 text-sm text-gray-400">
        <Link to="/" className="hover:text-neon-cyan transition-colors">首頁</Link>
        <span className="mx-2">/</span>
        <Link to="/tools" className="hover:text-neon-cyan transition-colors">工具列表</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-300">{tool.name}</span>
      </nav>

      {/* Tool Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="text-5xl">{tool.icon}</div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-100 font-display">
              {tool.name}
            </h1>
            <p className="text-gray-400 mt-1">{tool.description}</p>
          </div>
        </div>
      </div>

      {/* Tool Content */}
      <div className="mb-8">
        {renderTool()}
      </div>
    </div>
  )
}