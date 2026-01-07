import Header from "./components/Header";
import HeroSection from "./components/HeroSection";
import FeaturedCourses from "./components/FeaturedCourses";
import Categories from "./components/Categories";
import WhyChooseUs from "./components/WhyChooseUs";
import Testimonials from "./components/Testimonials";
import CTASection from "./components/CTASection";
import Footer from "./components/Footer";


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
