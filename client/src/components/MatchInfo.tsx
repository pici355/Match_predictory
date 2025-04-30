import { Card, CardContent } from "@/components/ui/card";

export default function MatchInfo() {
  return (
    <Card className="mb-8 shadow-md">
      <CardContent className="py-5">
        <div className="flex justify-between items-center">
          <div className="text-center w-2/5">
            <div className="font-bold">Newell's</div>
            <div className="mt-1 text-sm text-gray-500">Argentina</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-gray-500">VS</div>
            <div className="text-xs mt-1 text-gray-400">Amichevole</div>
          </div>
          <div className="text-center w-2/5">
            <div className="font-bold">Como</div>
            <div className="mt-1 text-sm text-gray-500">Italia</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
