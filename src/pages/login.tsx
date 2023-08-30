import { type NextPage } from "next";
import { useRouter } from "next/router";
import { useEffect } from "react";
import Layout from "~/components/layout";
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
    <Layout title={"Login - speedchess.net"}>
      <Login
        className="h-[30rem] w-80 3xl:h-[36rem] 3xl:w-96 3xl:text-xl"
        callbackUrl={callbackUrl as string}
      ></Login>
    </Layout>
  );
};

export default LoginPage;
