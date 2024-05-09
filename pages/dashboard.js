import { supabase } from "@/supabase/client";
import Link from "next/link";
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
        <div className="flex flex-col gap-4 h-screen w-full bg-gray-900 p-4">
            {
                session && session.user?.user_metadata?.avatar_url && (
                    <Link href="/profile">
                        <img
                            className="rounded-full h-10 w-10 absolute top-4 right-4"
                            src={session.user.user_metadata.avatar_url}
                        />
                    </Link>
                )
            }
            {
                session && !session.user?.user_metadata?.avatar_url && (
                    <Link href="/profile">
                        <button className="bg-blue-500 text-white px-4 py-2 rounded-md absolute top-4 right-4">Go To Profile</button>
                    </Link>
                )
            }
        </div>
    );
}
