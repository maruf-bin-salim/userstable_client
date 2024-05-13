import { supabase } from "@/supabase/client";
import { ArrowLeft, CircleDashed, LogOutIcon, User, UserCircle } from "lucide-react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import styles from '@/styles/profile.module.css'

export default function Profile() {
    const [session, setSession] = useState(null);
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [publicUserProfile, setPublicUserProfile] = useState(null);
    const [uuid, setUuid] = useState(null);
    const [error, setError] = useState('');

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
            setUuid(data[0].user_generated_id);
            return data[0];
        }
        else {
            return null;
        }
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


    useEffect(() => {

        let subscription = null;

        if (session) {
            subscription = supabase
                .channel('user_channel')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, payload => {
                    fetchPublicUserProfile(session).then(data => {
                        console.log('public user profile', data);
                        if (!data) {
                            supabase.auth.signOut().then(() => router.push('/'));
                        }
                    }
                    );
                })
                .subscribe()
        }


        return () => {
            if (subscription)
                supabase.removeChannel(subscription);
        };

    }
        , [session]);


    // 2024-05-09T17:49:46.184183Z
    function formatDate(date) {
        return new Date(date).toLocaleString();
    }

    if (!session) return null;

    // if (!publicUserProfile) return (
    //     <div className="flex justify-center items-center h-screen w-full bg-gray-900" >
    //         <p className="text-white text-2xl w-[100%] text-center">
    //             Loading...
    //         </p>
    //     </div>
    // )

    if (!publicUserProfile) return (
        <div className={styles.loader}>
            <p className={styles.loading_text}>
                <CircleDashed size={64} />
            </p>
        </div>
    )

    return (
        <div className={styles.container}>
            <button onClick={() => router.push('/dashboard')} className={styles.back_button}>
                <ArrowLeft size={36} />
            </button>

            {publicUserProfile &&
                <div className={styles.card}>

                    <h1 className={styles.heading}>
                        {
                            publicUserProfile?.role.toLowerCase() + ' ' + 'Profile'
                        }
                        <UserCircle size={24} />
                    </h1>
                    <div className={styles.flex}>
                        {session?.user?.user_metadata?.avatar_url && <img src={session.user.user_metadata.avatar_url} className={styles.avatar} />}
                        <p className={styles.card_text}>{publicUserProfile.email}</p>
                        <p className={styles.provider_text}>Logged in with {session?.user?.identities[0].provider}</p>
                        <button onClick={() => supabase.auth.signOut()} className={styles.logout_button}>
                            <LogOutIcon size={24} />
                        </button>
                    </div>

                    <p className={styles.card_text}>Your
                        ID: {publicUserProfile.user_generated_id}</p>
                    <p className={styles.card_text}>You joined at {formatDate(publicUserProfile.joined_at)}</p>
                    <p className={styles.card_text}>You last signed in at {formatDate(publicUserProfile.last_sign_in_at)}</p>

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

            <div className="flex flex-col gap-4 w-full md:w-[80%] lg:w-[60%] bg-gray-800 p-4 rounded-lg">
                <h1 className="text-white">Update user ID </h1>
                <input type="text" value={uuid} onChange={(e) => {
                    setError('');
                    setUuid(e.target.value);
                }}
                    className="bg-gray-700 text-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[100%] w-full md:w-[80%] lg:w-[25%]" />

                {
                    error !== '' && error !== 'success' && <p className="text-red-500 text-sm">{error}</p>
                }
                {
                    error === 'success' && <p className="text-green-500 text-sm">User ID updated successfully</p>
                }
                <button onClick={async () => {

                    console.log('uuid', uuid);

                    if (uuid === publicUserProfile.user_generated_id) {
                        console.log('User ID is same as before');
                        setError('User ID is same as before');
                        return;
                    }

                    if (uuid === '') {
                        console.log('User ID is empty');
                        setError('User ID is empty');
                        return;
                    }

                    const { data, error } = await supabase.from('users').upsert([{
                        id: publicUserProfile.id,
                        user_generated_id: uuid
                    }]);

                    if (error) {
                        setError('user ID taken by someone else, please try another');
                        console.log('error', error);
                    }
                    else {
                        await fetchPublicUserProfile(session);
                        setError('success');
                    }


                }} className="bg-blue-500 text-white px-4 py-2 rounded-md cursor-pointer w-[max-content]">
                    Update User ID
                </button>
            </div>

            <div className="w-full md:w-[80%] lg:w-[60%] bg-gray-800 p-4 rounded-lg">
                <h1 className="text-white">Delete Account</h1>
                <button onClick={async () => {
                    await supabase.from('users').delete().eq('id', session.user.id);
                    await supabase.rpc('deleteUser');
                    await supabase.auth.signOut();
                }} className="bg-red-500 text-white px-4 py-2 rounded-md mt-2">Delete Account</button>
            </div>

        </div>
    );
}
