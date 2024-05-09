import { supabase } from "@/supabase/client";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { v4 as uuidv4 } from 'uuid';

export default function Profile() {
    const [session, setSession] = useState(null);
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [publicUserProfile, setPublicUserProfile] = useState(null);
    const [uuid, setUuid] = useState(null);

    async function keepLatestIdentity() {
        const { data } = await supabase.auth.getUserIdentities();
        const identities = data?.identities || null;

        console.log('identities', identities);

        if (!identities) return;

        identities.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        const oldIdentities = identities.length > 1 ? identities.slice(0, -1) : [];
        oldIdentities.forEach(async identity => await supabase.auth.unlinkIdentity(identity));
    }

    async function upsertUser(session) {
        const { data, error } = await supabase.from('users').upsert([{
            id: session.user.id,
            email: session.user.email,
            last_sign_in_at: session.user.last_sign_in_at
        }]);
        if (error) console.error(error);
    }

    async function fetchPublicUserProfile(session) {
        const { data, error } = await supabase.from('users').select('*').eq('id', session.user.id);
        console.log(data, error);
        if (error) console.error(error);
        if (data && data.length > 0) {
            setPublicUserProfile(data[0]);
            setUuid(data[0].user_id);
        }
    }

    async function updateUuid(session) {
        const newUuid = uuidv4();
        setUuid(newUuid);
        await supabase.from('users').upsert([{
            id: session.user.id,
            user_id: newUuid
        }]);
        fetchPublicUserProfile(session);
    }

    useEffect(() => {
        const data = supabase.auth.onAuthStateChange(async (event, session) => {
            if ((event === 'SIGNED_OUT' || event === 'INITIAL_SESSION') && !session) {
                router.push('/');
            } else {
                console.log('session', session);
                if (session) {
                    console.log('session exists');
                    setEmail(session?.user.email);
                    console.log('keeping only latest identity');
                    keepLatestIdentity();
                    console.log('upserting user');
                    upsertUser(session);
                    console.log('fetching public user profile');
                    fetchPublicUserProfile(session);
                }
                setSession(session);
            }
        });

        return () => data.data.subscription.unsubscribe();
    }, []);

    // 2024-05-09T17:49:46.184183Z
    function formatDate(date) {
        return new Date(date).toLocaleString();
    }

    if (!session) return null;

    if (!publicUserProfile) return (
        <div className="flex justify-center items-center h-screen w-full bg-gray-900" >
            <p className="text-white text-2xl w-[100%] text-center">
                Loading...
            </p>
        </div>
    )

    return (
        <div className="flex flex-col gap-4 justify-center items-center md:items-start w-full bg-gray-900 p-4 min-h-screen relative">
            <button onClick={() => router.push('/dashboard')} className="bg-blue-500 text-white px-4 py-2 rounded-md absolute top-4 left-4">Go Back</button>

            {publicUserProfile &&
                <div className="w-full md:w-[80%] lg:w-[60%] bg-gray-800 p-4 rounded-lg mt-16">
                    <h1 className="text-white">Your Profile</h1>
                    <div className="flex items-center gap-2 p-4 px-0">
                        {session?.user?.user_metadata?.avatar_url && <img src={session.user.user_metadata.avatar_url} className="w-10 h-10 rounded-full" />}
                        <p className="text-gray-300">{publicUserProfile.email}</p>
                    </div>
                    <p className="text-gray-300">Your
                        ID: {publicUserProfile.user_id}</p>
                    <p className="text-gray-300">You joined at {formatDate(publicUserProfile.joined_at)}</p>
                    <p className="text-gray-300">You last signed in at {formatDate(publicUserProfile.last_sign_in_at)}</p>
                    <button onClick={() => supabase.auth.signOut()} className="bg-red-500 text-white px-4 py-2 rounded-md mt-2">Sign Out</button>
                </div>
            }

            <div className="w-full md:w-[80%] lg:w-[60%] bg-gray-800 p-4 rounded-lg">
                <p className="text-gray-300">Update Email</p>
                <div className="flex items-center gap-2 my-2 flex-wrap">
                    <input type="email" onChange={(e) => setEmail(e.target.value)} value={email}
                        className="bg-gray-700 text-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[100%]" />
                    {
                        email !== session?.user.email && email !== '' &&
                        <button onClick={async () => {

                            const { data, error } = await supabase.auth.updateUser({ email: email });
                            if (error) {
                                alert('Error updating email', error.message);
                            }
                            else {
                                alert(`Email Updation Started. Please click both ${email} and ${session.user.email} for verification email. Signing Out now.`);
                                await supabase.auth.signOut();
                            }
                        }} className="bg-blue-500 text-white px-4 py-2 rounded-md">Update Email</button>
                    }
                    {
                        session && email !== session?.user.email &&
                        <button className="bg-gray-500 text-white px-4 py-2 rounded-md cursor-pointer"
                            onClick={() => {
                                setEmail(session?.user.email);
                            }}
                        >x</button>
                    }
                </div>
                {/*                 
                    show a message that says, after clicking update email, you will be signed out and you need to verify your email
                    you will be sent a verification email to both ${email} and ${session.user.email}
                    click both links to verify your email change operation
                 */}
                {
                    email !== session?.user.email && email !== '' && (

                        <div className="bg-green-300 text-white px-4 py-2 rounded-md mt-2 max-w-[100%] w-[100%] md:w-[80%]">
                            <p className="text-black font-thin text-sm">
                                {`After clicking, you will be signed out and you need to verify your email. `}
                            </p>
                            <p className="text-black font-thin text-sm">
                                {`You will be sent a verification email to both `}
                                <span className="font-bold text-blue-500">
                                    {email}
                                </span>
                                {` and `}
                                <span className="font-bold text-blue-500">
                                    {session?.user.email} .
                                </span>
                            </p>
                            <p className="text-black font-thin text-sm">{`Click both links to verify your email change request .`}</p>
                        </div>
                    )
                }

            </div>

            <div className="w-full md:w-[80%] lg:w-[60%] bg-gray-800 p-4 rounded-lg">
                <h1 className="text-white">Update user ID </h1>
                <button onClick={() => updateUuid(session)} className="bg-blue-500 text-white px-4 py-2 rounded-md mt-2">Generate Random User ID</button>
            </div>

            <div className="w-full md:w-[80%] lg:w-[60%] bg-gray-800 p-4 rounded-lg">
                <h1 className="text-white">Delete Account</h1>
                <button onClick={async () => {
                    await supabase.rpc('deleteUser');
                    await supabase.auth.signOut();
                }} className="bg-red-500 text-white px-4 py-2 rounded-md mt-2">Delete Account</button>
            </div>

        </div>
    );
}
