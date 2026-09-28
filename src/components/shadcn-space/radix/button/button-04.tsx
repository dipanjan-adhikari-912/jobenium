import { Button } from "@/components/ui/button";
import "@/components/shadcn-space/radix/button/button-04.css";

const ButtonHeartbeatEffectDemo = () => {
  return (
    <>
      <Button variant="destructive" className="heartbeateffect cursor-pointer">
        Heartbeat Effect
      </Button>
    </>
  );
};

export default ButtonHeartbeatEffectDemo;
