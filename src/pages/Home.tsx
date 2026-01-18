import { Link } from 'react-router-dom'
import { tools } from '@/data/tools'

export default function Home() {
  const featuredTools = tools.slice(0, 3)

  return (
    <div className="relative overflow-hidden">
      {/* Hero Section */}
      <section className="relative pt-20 pb-32 px-4 sm:px-6 lg:px-8">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-neon-blue/10 rounded-full blur-3xl animate-float"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neon-purple/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="relative max-w-7xl mx-auto">
          <div className="text-center">
            {/* Main Heading */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6">
              <span className="text-gradient font-display">棉花糖工具箱</span>
              <br />
              <span className="text-3xl sm:text-4xl lg:text-5xl text-gray-300 mt-2 block">
                Marshmallow Toolbox
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-xl sm:text-2xl text-gray-400 max-w-3xl mx-auto mb-8 leading-relaxed">
              專業工具集合平台
              <span className="block mt-2 text-lg text-gray-500">
                提供多種實用工具，提升您的生產力與工作效率
              </span>
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-10">
              <Link
                to="/tools"
                className="px-8 py-3 bg-gradient-to-r from-neon-blue to-neon-purple text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-neon-blue/50 transition-all duration-300 transform hover:scale-105"
              >
                探索工具
              </Link>
              <a
                href="#features"
                className="px-8 py-3 border border-dark-border text-gray-300 font-semibold rounded-lg hover:border-neon-cyan hover:text-neon-cyan transition-all duration-300"
              >
                了解更多
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-dark-surface/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-100 mb-4 font-display">
              為什麼選擇棉花糖工具箱？
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              專為現代工作流程設計的工具平台，結合美觀與實用性
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="glass-effect p-6 rounded-xl card-hover">
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="text-xl font-semibold text-gray-100 mb-2">高效能</h3>
              <p className="text-gray-400">
                所有工具均經過優化，確保快速響應與流暢體驗
              </p>
            </div>

            {/* Feature 2 */}
            <div className="glass-effect p-6 rounded-xl card-hover">
              <div className="text-4xl mb-4">🎨</div>
              <h3 className="text-xl font-semibold text-gray-100 mb-2">現代設計</h3>
              <p className="text-gray-400">
                深色主題與科技感視覺，提供舒適的使用環境
              </p>
            </div>

            {/* Feature 3 */}
            <div className="glass-effect p-6 rounded-xl card-hover">
              <div className="text-4xl mb-4">🔧</div>
              <h3 className="text-xl font-semibold text-gray-100 mb-2">持續更新</h3>
              <p className="text-gray-400">
                定期新增實用工具，滿足您的各種需求
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Tools Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-100 mb-4 font-display">
              精選工具
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              探索我們最受歡迎的工具
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {featuredTools.map((tool) => (
              <Link
                key={tool.id}
                to={tool.route}
                className="glass-effect p-6 rounded-xl card-hover group"
              >
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">
                  {tool.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-100 mb-2 group-hover:text-neon-cyan transition-colors">
                  {tool.name}
                </h3>
                <p className="text-gray-400 text-sm">{tool.description}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {tool.tags.slice(0, 2).map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 text-xs bg-dark-card text-gray-300 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              to="/tools"
              className="inline-block px-6 py-3 border border-neon-cyan text-neon-cyan font-semibold rounded-lg hover:bg-neon-cyan/10 transition-all duration-300"
            >
              查看所有工具 →
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}