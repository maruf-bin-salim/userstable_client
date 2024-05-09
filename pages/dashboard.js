import { supabase } from "@/supabase/client";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function Dashboard() {
    const [session, setSession] = useState(null);
    const router = useRouter();



    useEffect(() => {
        const data = supabase.auth.onAuthStateChange(async (event, session) => {
            if ((event === 'SIGNED_OUT' || event === 'INITIAL_SESSION') && !session) {
                router.push('/');
            } else {
                setSession(session);
            }
        });

        return () => data.data.subscription.unsubscribe();
    }, []);



    return (
        <div className="flex flex-col gap-4 justify-center items-center h-screen w-full bg-gray-900 p-4">
            {
            }
        </div>
    );
}
