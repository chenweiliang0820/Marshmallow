export default function ToolCanva() {
  return (
    <div className="glass-effect p-8 rounded-xl">
      <h2 className="text-2xl font-semibold text-gray-100 mb-6">
        Canva 工具集
      </h2>
      <div className="space-y-4">
        <div className="p-6 bg-dark-card/50 rounded-lg border border-dark-border">
          <h3 className="text-lg font-medium text-gray-200 mb-2">圖片尺寸調整</h3>
          <p className="text-gray-400 text-sm mb-4">
            快速調整圖片尺寸，支援多種常用規格
          </p>
          <button className="px-4 py-2 bg-neon-blue/20 text-neon-cyan rounded-lg hover:bg-neon-blue/30 transition-colors">
            使用工具
          </button>
        </div>

        <div className="p-6 bg-dark-card/50 rounded-lg border border-dark-border">
          <h3 className="text-lg font-medium text-gray-200 mb-2">圖片壓縮</h3>
          <p className="text-gray-400 text-sm mb-4">
            壓縮圖片檔案大小，保持品質的同時減少檔案體積
          </p>
          <button className="px-4 py-2 bg-neon-blue/20 text-neon-cyan rounded-lg hover:bg-neon-blue/30 transition-colors">
            使用工具
          </button>
        </div>

        <div className="p-6 bg-dark-card/50 rounded-lg border border-dark-border">
          <h3 className="text-lg font-medium text-gray-200 mb-2">格式轉換</h3>
          <p className="text-gray-400 text-sm mb-4">
            在不同圖片格式間快速轉換（JPG, PNG, WebP 等）
          </p>
          <button className="px-4 py-2 bg-neon-blue/20 text-neon-cyan rounded-lg hover:bg-neon-blue/30 transition-colors">
            使用工具
          </button>
        </div>
      </div>
    </div>
  )
}