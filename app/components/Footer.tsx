import Link from "next/link";
import { Facebook, Github, Youtube, Mail } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-nobel-dark text-stone-400 py-20 border-t border-stone-800">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          
          {/* Brand Column */}
          <div className="col-span-1 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 bg-nobel-gold rounded-full flex items-center justify-center text-nobel-dark font-serif font-bold text-lg">
                α
              </div>
              <span className="font-serif font-bold text-xl text-white">
                Aura Learning
              </span>
            </Link>
            <p className="text-sm font-light leading-relaxed opacity-80 mb-6">
              Nền tảng giáo dục lập trình hiện đại, tập trung vào tư duy cốt lõi và ứng dụng thực tế.
            </p>
            <div className="flex gap-4">
                {[Facebook, Github, Youtube, Mail].map((Icon, idx) => (
                    <a key={idx} href="#" className="w-8 h-8 rounded-full border border-stone-700 flex items-center justify-center hover:bg-nobel-gold hover:border-nobel-gold hover:text-nobel-dark transition-all">
                        <Icon size={16} />
                    </a>
                ))}
            </div>
          </div>

          {/* Links Column 1 */}
          <div>
            <h4 className="text-white font-serif font-bold mb-6">Khám phá</h4>
            <ul className="space-y-4 text-sm">
                {['Lộ trình Frontend', 'Lộ trình Backend', 'Fullstack Master', 'DevOps Basic'].map(item => (
                    <li key={item}><Link href="#" className="hover:text-nobel-gold transition-colors">{item}</Link></li>
                ))}
            </ul>
          </div>

          {/* Links Column 2 */}
          <div>
            <h4 className="text-white font-serif font-bold mb-6">Về Aura</h4>
            <ul className="space-y-4 text-sm">
                {['Câu chuyện', 'Đội ngũ', 'Liên hệ', 'Điều khoản'].map(item => (
                    <li key={item}><Link href="#" className="hover:text-nobel-gold transition-colors">{item}</Link></li>
                ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="text-white font-serif font-bold mb-6">Đăng ký nhận tin</h4>
            <p className="text-xs mb-4 opacity-70">Nhận bài viết mới nhất về công nghệ hàng tuần.</p>
            <form className="flex flex-col gap-2">
                <input 
                    type="email" 
                    placeholder="Email của bạn" 
                    className="bg-stone-800 border border-stone-700 text-white px-4 py-3 rounded-lg text-sm focus:outline-none focus:border-nobel-gold transition-colors"
                />
                <button className="bg-nobel-gold text-nobel-dark font-bold uppercase text-xs tracking-wider py-3 rounded-lg hover:bg-white transition-colors">
                    Đăng ký
                </button>
            </form>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-stone-800 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-bold tracking-widest uppercase text-stone-600">
            <p>© 2026 Aura Inc. All rights reserved.</p>
            <div className="flex gap-8">
                <a href="#" className="hover:text-nobel-gold">Privacy Policy</a>
                <a href="#" className="hover:text-nobel-gold">Terms of Service</a>
            </div>
        </div>
      </div>
    </footer>
  );
}