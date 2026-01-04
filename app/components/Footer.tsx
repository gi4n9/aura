import Link from "next/link";

const footerLinks = {
    product: [
        { name: "Khóa học", href: "/courses" },
        { name: "Lộ trình", href: "/paths" },
        { name: "Chứng chỉ", href: "/certificates" },
        { name: "Doanh nghiệp", href: "/business" }
    ],
    company: [
        { name: "Về chúng tôi", href: "/about" },
        { name: "Đội ngũ", href: "/team" },
        { name: "Blog", href: "/blog" },
        { name: "Tuyển dụng", href: "/careers" }
    ],
    support: [
        { name: "Trung tâm hỗ trợ", href: "/help" },
        { name: "FAQ", href: "/faq" },
        { name: "Liên hệ", href: "/contact" },
        { name: "Phản hồi", href: "/feedback" }
    ],
    legal: [
        { name: "Điều khoản", href: "/terms" },
        { name: "Bảo mật", href: "/privacy" },
        { name: "Cookie", href: "/cookies" }
    ]
};

const socialLinks = [
    { name: "Facebook", icon: "M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" },
    { name: "YouTube", icon: "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" },
    { name: "LinkedIn", icon: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" }
];

export default function Footer() {
    return (
        <footer className="bg-[var(--neutral-900)] text-white pt-16 pb-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-2 md:grid-cols-6 gap-8 pb-12 border-b border-[var(--neutral-800)]">
                    <div className="col-span-2">
                        <Link href="/" className="flex items-center gap-2 mb-4">
                            <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
                                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <span className="text-xl font-bold">Aura Learning</span>
                        </Link>
                        <p className="text-[var(--neutral-400)] text-sm mb-6 max-w-xs">
                            Nền tảng học trực tuyến hàng đầu Việt Nam với hơn 500 khóa học chất lượng cao.
                        </p>
                        <div className="flex gap-4">
                            {socialLinks.map((social) => (
                                <a key={social.name} href="#" className="w-10 h-10 rounded-full bg-[var(--neutral-800)] hover:bg-[var(--primary-500)] flex items-center justify-center transition-colors">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d={social.icon} /></svg>
                                </a>
                            ))}
                        </div>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-4">Sản phẩm</h4>
                        <ul className="space-y-3">{footerLinks.product.map((link) => (<li key={link.name}><Link href={link.href} className="text-[var(--neutral-400)] hover:text-white text-sm transition-colors">{link.name}</Link></li>))}</ul>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-4">Công ty</h4>
                        <ul className="space-y-3">{footerLinks.company.map((link) => (<li key={link.name}><Link href={link.href} className="text-[var(--neutral-400)] hover:text-white text-sm transition-colors">{link.name}</Link></li>))}</ul>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-4">Hỗ trợ</h4>
                        <ul className="space-y-3">{footerLinks.support.map((link) => (<li key={link.name}><Link href={link.href} className="text-[var(--neutral-400)] hover:text-white text-sm transition-colors">{link.name}</Link></li>))}</ul>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-4">Pháp lý</h4>
                        <ul className="space-y-3">{footerLinks.legal.map((link) => (<li key={link.name}><Link href={link.href} className="text-[var(--neutral-400)] hover:text-white text-sm transition-colors">{link.name}</Link></li>))}</ul>
                    </div>
                </div>
                <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-[var(--neutral-500)] text-sm">© 2024 Aura Learning. All rights reserved.</p>
                    <div className="flex items-center gap-2">
                        <span className="text-[var(--neutral-500)] text-sm">Made with</span>
                        <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" /></svg>
                        <span className="text-[var(--neutral-500)] text-sm">in Vietnam</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
