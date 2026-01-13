import Header from "@/app/components/Header";
import HeroSection from "@/app/components/HeroSection";
import FeaturedCourses from "@/app/components/FeaturedCourses";
import Categories from "@/app/components/Categories";
import WhyChooseUs from "@/app/components/WhyChooseUs";
import Testimonials from "@/app/components/Testimonials";
import CTASection from "@/app/components/CTASection";
import Footer from "@/app/components/Footer";


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
      </main>
      <Footer />
    </>
  );
}
