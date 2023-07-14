import { type NextPage } from "next";
import { useRouter } from "next/router";
import { useEffect } from "react";
import Login from "~/components/login";

const LoginPage: NextPage = () => {
  const router = useRouter();
  const { callbackUrl } = router.query;

  useEffect(() => {
    console.log(callbackUrl);
  }, [callbackUrl]);

  if (!router.isReady) {
    return <div> Loading... </div>;
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center py-10">
      <Login
        className="h-[30rem] w-80 3xl:h-[36rem] 3xl:w-96 3xl:text-xl"
        callbackUrl={callbackUrl as string}
      ></Login>
    </div>
  );
};

export default LoginPage;
