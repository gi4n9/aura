import Header from "./components/Header";
import HeroSection from "./components/HeroSection";
import FeaturedCourses from "./components/FeaturedCourses";
import Categories from "./components/Categories";
import WhyChooseUs from "./components/WhyChooseUs";
import Testimonials from "./components/Testimonials";
import CTASection from "./components/CTASection";
import Footer from "./components/Footer";
import Link from "next/link";
import StaggeredText from "./components/StaggeredText";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <HeroSection />
        <FeaturedCourses />
        <Categories />
        <WhyChooseUs />
        <Testimonials />
        <CTASection />
        <Link href="/store" className="block py-2">
          <StaggeredText
            text="STORE"
            className="text-sm font-extrabold tracking-wider text-black"
          />
        </Link>

        <Link href="/courses" className="block py-2">
          <StaggeredText
            text="KHÓA HỌC"
            className="text-sm font-bold text-gray-700 hover:text-blue-600"
          />
        </Link>
      </main>
      <Footer />
    </>
  );
}
