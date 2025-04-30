import PredictionForm from "@/components/PredictionForm";
import MatchInfo from "@/components/MatchInfo";
import Footer from "@/components/Footer";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 py-8 px-4">
      <div className="max-w-md mx-auto">
        <PredictionForm />
        <MatchInfo />
        <Footer />
      </div>
    </div>
  );
}
