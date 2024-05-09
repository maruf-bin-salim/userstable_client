import { supabase } from "@/supabase/client";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function Dashboard() {

    const [session, setSession] = useState(null);
    const router = useRouter();
    const [email, setEmail] = useState(session?.user.email || '');

    useEffect(() => {
        const data = supabase.auth.onAuthStateChange((event, session) => {
            console.log(`Supabase Auth State Change: ${event}`);



            if ((event === 'SIGNED_OUT' || event === 'INITIAL_SESSION') && !session) {
                router.push('/');
            }
            else {
                if (session) {
                    setEmail(session?.user.email);
                }
                setSession(session);
            }
        });

        return () => {
            data.data.subscription.unsubscribe();
        };
    }, []);



    return (
        <div className="flex justify-center items-center h-screen w-[100%] bg-[#2b2b2b]">
            {session && <div className="absolute top-0 right-0 p-4 bg-[#3b3b3b] text-white">User: {session.user.email}</div>}
            <div className="block min-w-[90vw] md:min-w-[300px] lg:min-w-[400px] bg-[#3b3b3b] p-4 rounded-[20px]">
                <h1 className="text-white">Dashboard</h1>
                <p>
                    Update Email
                </p>
                <input type="email" onChange={(e) => setEmail(e.target.value)}
                    value={email}
                />
                <button onClick={async () => {
                    const { data, error } = await supabase.auth.updateUser({ email: email });
                    console.log(data, error);
                }}>Update Email</button>
                <button onClick={() => supabase.auth.signOut()}>Sign Out</button>
            </div>
        </div>
    );
}