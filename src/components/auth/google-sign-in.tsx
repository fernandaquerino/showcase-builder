import { Button } from "@/components/ui/button";
import { googleSignInAction } from "@/server/actions/auth/oauth";

export function GoogleSignIn() {
  return (
    <form action={googleSignInAction}>
      <Button type="submit" variant="outline" className="w-full">
        <span aria-hidden="true" className="font-semibold">
          G
        </span>
        Continuar com Google
      </Button>
    </form>
  );
}
