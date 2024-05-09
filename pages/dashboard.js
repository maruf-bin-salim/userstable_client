import { supabase } from "@/supabase/client";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function Dashboard() {
    const [session, setSession] = useState(null);
    const router = useRouter();

    const [isLoading, setIsLoading] = useState(false);
    const [users, setUsers] = useState([]);

    useEffect(() => {
        const fetchUsers = async () => {
            setIsLoading(true);
            const { data, error } = await supabase.from('users').select('*');
            if (error) console.error(error);
            setUsers(data);
            setIsLoading(false);
        };

        fetchUsers();
    }, []);



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



    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-screen w-full bg-gray-900" >
                <p className="text-white text-2xl w-[100%] text-center">
                    Loading...
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 h-screen w-full bg-gray-900 p-4 overflow-x-auto relative">
            {
                session && session.user?.user_metadata?.avatar_url && (
                    <Link href="/profile">
                        <img
                            className="rounded-full h-10 w-10 fixed top-4 left-4"
                            src={session.user.user_metadata.avatar_url}
                        />
                    </Link>
                )
            }
            {
                session && !session.user?.user_metadata?.avatar_url && (
                    <Link href="/profile">
                        <button className="bg-blue-500 text-white px-4 py-2 rounded-md fixed top-4 right-4">Go To Profile</button>
                    </Link>
                )
            }

            {/* table */}

            {/* show user_id, email, last_sign_in_at, joined_at */}

            <table className="w-full bg-gray-800 rounded-lg mt-16 overflow-x-scroll sm:overflow-x-auto">

                <thead className="bg-gray-700">
                    <tr className="text-left">
                        <th className="text-white p-2">User ID</th>
                        <th className="text-white p-2">Email</th>
                        <th className="text-white p-2">Last Sign In</th>
                        <th className="text-white p-2">Joined At</th>
                    </tr>
                </thead>

                <tbody className="bg-gray-900">
                    {
                        users.map((user) => (
                            <tr key={user.id} className="text-left border-b border-gray-700">
                                <td className="text-gray-300 p-2">
                                    {user.id}
                                </td>
                                <td className="text-gray-300 p-2">
                                    {user.email}
                                </td>
                                <td className="text-gray-300 p-2">
                                    {new Date(user.last_sign_in_at).toLocaleString()}
                                </td>
                                <td className="text-gray-300 p-2">
                                    {new Date(user.joined_at).toLocaleString()}
                                </td>
                            </tr>
                        ))
                    }
                </tbody>

            </table>


        </div>
    );
}
